const controller = require("../controller");
const axios = require("axios");
const neshan = process.env.NESHAN;

function escapeRegExp(string) {
  return string.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

module.exports = new (class extends controller {
  async getCityProvinceByDistrict(req, res) {
    try {
      const type = "district";
      const id = req.query.id;
      if (req.query.id === undefined) {
        return this.response({
          res,
          code: 204,
          message: "id need!",
        });
      }

      const district = await this.Keys.findOne({
        type,
        active: true,
        delete: false,
        keyId: parseInt(req.query.id),
      });
      if (!district) {
        return this.response({
          res,
          code: 404,
          message: "district not find",
        });
      }
      const city = await this.City.findOne({
        active: true,
        delete: false,
        code: district.cityCode,
      });
      if (!city) {
        return this.response({
          res,
          code: 404,
          message: "city not find",
        });
      }

      return this.response({
        res,
        message: "ok",
        data: { city },
      });
    } catch (error) {
      console.error("Error in getCityProvinceByDistrict:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }
  async getKeys(req, res) {
    try {
      const type = req.query.type || "district";
      const city = req.query.city || "0";
      const keys = await this.Keys.find({
        type,
        cityCode: parseInt(city),
        active: true,
        delete: false,
      });
      // const keys = await this.findRedisDocument(`keys:${type}`);

      return this.response({
        res,
        message: "ok",
        data: keys,
      });
    } catch (error) {
      console.error("Error in getKeys:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }

  async setKeys(req, res) {
    try {
      const type = req.body.type;
      const title = req.body.title;
      const cityCode = req.body.cityCode;
      let titleEn = "";
      if (req.body.titleEn != undefined) {
        titleEn = req.body.titleEn;
      }
      // console.log("titleEn=", titleEn);
      if (req.body.id != undefined) {
        const id = req.body.id;
        let oldKey = await this.Keys.findByIdAndUpdate(
          id,
          {
            title,
            titleEn,
          },
          { new: true }
        );
        await this.updateRedisDocument(
          `keys:${oldKey.type}:${oldKey._id}`,
          oldKey
        );

        return this.response({
          res,
          data: oldKey,
        });
      }

      let newKey = new this.Keys({
        title,
        type,
        titleEn,
        cityCode,
      });
      await newKey.save();
      const kk = await this.Keys.findById(newKey._id);
      // await this.updateRedisDocument(`keys:${kk.type}:${kk._id}`, kk);
      await this.redisClient.set(
        `keys:${kk.type}:${kk._id}`,
        JSON.stringify(kk)
      );

      return this.response({
        res,
        data: kk,
      });
    } catch (error) {
      console.error("Error in setKeys:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }

  async getAddress(req, res) {
    const isImportant = req.query.isImportant || "yes";
    try {
      if (
        req.query.lat === undefined ||
        req.query.lng === undefined ||
        req.query.lat.trim() === "" ||
        req.query.lng.trim() === ""
      ) {
        return this.response({
          res,
          code: 204,
          message: "lat and lng need!",
        });
      }
      const lat = req.query.lat;
      const lng = req.query.lng;

      const url = `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`;
      const url2 = `https://map.ir/reverse?lat=${lat}&lon=${lng}`;
      const options = {
        headers: {
          "Api-Key": neshan,
        },
        timeout: 9500,
      };
      
      const options2 = {
        headers: {
          "x-api-key":
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjBkYWY2MGViM2JiMWVhMjA2ZTBmMzg0ZjY3YzMyNDNmODUzMTgzOWE5N2MwNzg1ZDRhYjBiZGFkN2NhOTBjZWE1NmQ0ZGEwOWNmNDk4MTVhIn0.eyJhdWQiOiIyODcxMiIsImp0aSI6IjBkYWY2MGViM2JiMWVhMjA2ZTBmMzg0ZjY3YzMyNDNmODUzMTgzOWE5N2MwNzg1ZDRhYjBiZGFkN2NhOTBjZWE1NmQ0ZGEwOWNmNDk4MTVhIiwiaWF0IjoxNzI1ODY2Njg0LCJuYmYiOjE3MjU4NjY2ODQsImV4cCI6MTcyODQ1ODY4NCwic3ViIjoiIiwic2NvcGVzIjpbImJhc2ljIl19.MedqlSr4RtUZ-2f0KsbCHcCqs7FblL4LbbbRj2-qvsGc5nw0A9AtcqP1v4DXjuR6LiU25BflOhmFhoNbRHr8WGX5LRQDa89dEAUzTcw2zqrCM-XC_e5h0FdAtd4MoK0HaYu4dBsznIxfm1JxGD7XmR8IewbYE8e-6wKnA9eBSXzs9DXG84CiSNkuRZ-99DeeRgWF3IOKplKxNrGsMmf-vnT_0K9WL-juU7xXGWTbYtNJEGnpeibl1vGI-70gJFjESQmmB4LbdMuyCJ68b9o6TgPF-qMaMV4OElj9rkHKICvRv6zMq5ImSXOPPPwF8vl_fXJ4G5mf7FWIyR_UisTE3A",
        },
        timeout: 9500,
      };

      const response = await axios.get(url, options);
      // const response2 = await axios.get(url2, options2);
      // console.log("response",response);
      // console.log("response2",response2);
      // const data2 = response2.data;
      const data = response.data;

      return this.response({
        res,
        message: "ok",
        data: {
          city: data.city,
          address: data.formatted_address,
          IsValid: true,
        },
      });
      // return this.response({
      //     res,
      //     message: "ok",
      //     data: {
      //         city: data2.city,
      //         address: data2.postal_address,
      //         IsValid: true,
      //     },
      // });
    } catch (error) {
      console.error("Error in getAddress:", "neshan error", error.data);
      if (isImportant === "yes") {
        return res.status(500).json({ error: "Internal Server Error." });
      } else {
        return this.response({
          res,
          code: 201,
          message: "neshan not working",
        });
      }
    }
  }
  async getAddress2(req, res) {
    const isImportant = req.body.isImportant || false;
    console.log("isImportant", isImportant);
    try {
      const lat = req.body.lat;
      const lng = req.body.lng;
      const checkLat = req.body.checkLat || 0;
      const checkLng = req.body.checkLng || 0;

      const url = `https://api.neshan.org/v5/reverse?lat=${lat}&lng=${lng}`;
      const url2 = `https://map.ir/reverse?lat=${lat}&lon=${lng}`;
      const options = {
        headers: {
          "Api-Key": neshan,
        },
        timeout: 9500,
      };
      
      const options2 = {
        headers: {
          "x-api-key":
            "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiIsImp0aSI6IjBkYWY2MGViM2JiMWVhMjA2ZTBmMzg0ZjY3YzMyNDNmODUzMTgzOWE5N2MwNzg1ZDRhYjBiZGFkN2NhOTBjZWE1NmQ0ZGEwOWNmNDk4MTVhIn0.eyJhdWQiOiIyODcxMiIsImp0aSI6IjBkYWY2MGViM2JiMWVhMjA2ZTBmMzg0ZjY3YzMyNDNmODUzMTgzOWE5N2MwNzg1ZDRhYjBiZGFkN2NhOTBjZWE1NmQ0ZGEwOWNmNDk4MTVhIiwiaWF0IjoxNzI1ODY2Njg0LCJuYmYiOjE3MjU4NjY2ODQsImV4cCI6MTcyODQ1ODY4NCwic3ViIjoiIiwic2NvcGVzIjpbImJhc2ljIl19.MedqlSr4RtUZ-2f0KsbCHcCqs7FblL4LbbbRj2-qvsGc5nw0A9AtcqP1v4DXjuR6LiU25BflOhmFhoNbRHr8WGX5LRQDa89dEAUzTcw2zqrCM-XC_e5h0FdAtd4MoK0HaYu4dBsznIxfm1JxGD7XmR8IewbYE8e-6wKnA9eBSXzs9DXG84CiSNkuRZ-99DeeRgWF3IOKplKxNrGsMmf-vnT_0K9WL-juU7xXGWTbYtNJEGnpeibl1vGI-70gJFjESQmmB4LbdMuyCJ68b9o6TgPF-qMaMV4OElj9rkHKICvRv6zMq5ImSXOPPPwF8vl_fXJ4G5mf7FWIyR_UisTE3A",
        },
        timeout: 12000,
      };

      const response = await axios.get(url, options);

      // const response2 = await axios.get(url2, options2);

      // console.log("response2",response2);
      // const data2 = response2.data;
      const data = response.data;
      let routing = {};
      if (checkLat != 0) {
        const firstLoc = `${lng},${lat}`;
        const secLoc = `${checkLng},${checkLat}`;
        const url = `${process.env.ROUTE_URL}/route/v1/driving/${firstLoc};${secLoc}?overview=full`;
        //  console.log("url", url);
        try {
          const response = await axios.get(url);
          if (response.status === 200) {
            if (response.data.code.toString().toLowerCase() === "ok") {
              routing.distance = response.data.routes[0].distance;
              routing.duration = response.data.routes[0].duration;
              routing.geometry = response.data.routes[0].geometry;
            }
          }
        } catch (e) {
          console.error("response", e);
        }
      }

      return this.response({
        res,
        message: "ok",
        data: {
          city: data.city,
          address: data.formatted_address,
          IsValid: true,
          routing,
        },
      });
      // return this.response({
      //     res,
      //     message: "ok",
      //     data: {
      //         city: data2.city,
      //         address: data2.postal_address,
      //         IsValid: true,
      //     },
      // });
    } catch (error) {
      console.log("isImportant", isImportant);
      console.error("Error in getAddress:", "neshan error", error.data);
      if (isImportant) {
        return res.status(500).json({ error: "Internal Server Error." });
      } else {
        return this.response({
          res,
          code: 201,
          message: "neshan not working",
        });
      }
    }
  }

  async searchAddress(req, res) {
    try {
      if (
        req.query.lat === undefined ||
        req.query.lng === undefined ||
        req.query.term === undefined
      ) {
        return this.response({
          res,
          code: 204,
          message: "lat، lng & term need!",
        });
      }
      const lat = parseFloat(req.query.lat);
      const lng = parseFloat(req.query.lng);
      const term = escapeRegExp(req.query.term);
      // const searchLog = await this.SearchLog.aggregate([
      //     {
      //         $geoNear: {
      //             near: {
      //                 type: "Point",
      //                 coordinates: [lat, lng],
      //             },
      //             key: "center",
      //             distanceField: "dist.calculated",
      //             maxDistance: 2000,
      //             spherical: true,
      //         },
      //     },
      //     {
      //         $match: { term: { $regex: term + ".*" } },
      //     },
      //     { $limit: 1 },
      // ]);
      // console.log("searchLog", searchLog);
      // if (searchLog.length > 0) {
      //     return this.response({
      //         res,
      //         message: "ok",
      //         data: searchLog[0].list,
      //     });
      // }

      const url = `https://api.neshan.org/v1/search?term=${term}&lat=${lat}&lng=${lng}`;

      const options = {
        headers: {
          "Api-Key": neshan,
        },
        timeout: 9500,
      };

      // console.log("url=", url);
      const response = await axios.get(url, options);

      const data = response.data;

      let items = data.items || [];
      // console.log("data=", data);
      let addresses = [];

      if (data.count > 0) {
        items.forEach((item) => {
          addresses.push({
            title: item.title,
            address: item.address || "",
            neighbourhood: item.neighbourhood || "",
            x: item.location.x,
            y: item.location.y,
          });
        });
      }
      let userId = req.query.id || "";
      if (userId.trim() === "") {
        userId = req.user._id;
      }
      //   await new this.SearchLog({
      //     userId,
      //     term,
      //     center: { type: "Point", coordinates: [lat, lng] },
      //     list: addresses,
      //   }).save();

      return this.response({
        res,
        message: "ok",
        data: addresses,
      });
    } catch (error) {
      console.error("Error in searchAddress:", error);
      return res.status(500).json({ error: "neshan Error." });
    }
  }
  async getMySearch(req, res) {
    try {
      const location = req.body.location;
      let id;
      if (req.body.id) {
        id = ObjectId.createFromHexString(req.body.id);
      } else {
        id = req.user._id;
      }

      console.log("getMySearch id", id);
      const searchLog = await this.SearchLog.aggregate([
        {
          $geoNear: {
            near: {
              type: "Point",
              coordinates: location,
            },
            key: "center",
            distanceField: "dist.calculated",
            maxDistance: 200000,
            spherical: true,
          },
        },
        {
          $match: { userId: id },
        },
        { $limit: 10 },
        { $sort: { "dist.calculated": 1 } },
        {
          $project: { _id: 1, term: 1 },
        },
      ]);
      return this.response({
        res,
        data: searchLog,
      });
    } catch (error) {
      console.error("Error in getMySearch:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }
  async getSearchById(req, res) {
    try {
      const id = req.query.id;
      const searchLog = await this.SearchLog.findById(id);
      if (!searchLog) {
        return this.response({
          res,
          code: 404,
        });
      }
      return this.response({
        res,
        data: searchLog.list,
      });
    } catch (error) {
      console.error("Error in getSearchById:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }
  async deleteKey(req, res) {
    try {
      if (req.query.id === undefined || req.query.id.trim() === "") {
        return this.response({
          res,
          code: 204,
          message: "id need!",
        });
      }
      const id = req.query.id;
      await this.Keys.findByIdAndUpdate(id, {
        delete: true,
      });
      await this.updateRedisDocument(`keys:${update.type}:${id}`, {
        delete: true,
      });

      return this.response({
        res,
        message: "delete",
      });
    } catch (error) {
      console.error("Error in deleteKey:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }

  async getDistanceNesahn(req, res) {
    try {
      if (
        req.query.originLat === undefined ||
        req.query.originLng === undefined ||
        req.query.destLat === undefined ||
        req.query.destLng === undefined ||
        req.query.originLat.trim() === "" ||
        req.query.originLng.trim() === "" ||
        req.query.destLat.trim() === "" ||
        req.query.destLng.trim() === ""
      ) {
        return this.response({
          res,
          code: 204,
          message: "lat and lng need!",
        });
      }
      const originLat = req.query.originLat;
      const originLng = req.query.originLng;
      let origin = originLat + "," + originLng;
      const destLat = req.query.destLat;
      const destLng = req.query.destLng;
      let destination = destLat + "," + destLng;
      const url = `https://api.neshan.org/v1/distance-matrix?origins=${origin}&destinations=${destination}`;

      const options = {
        headers: {
          "Api-Key": neshan,
        },
        timeout: 9500,
      };

      const response = await axios.get(url, options);

      const data = response.data;

      const rows = data.rows;
      const row = rows[0].elements;
      const distance = row[0].distance.value;
      const duration = row[0].duration.text;

      return this.response({
        res,
        message: "ok",
        data: {
          distance,
          duration,
        },
      });
    } catch (error) {
      console.error("Error in getDistance:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }
  async getDistance(req, res) {
    try {
      if (
        req.query.originLat === undefined ||
        req.query.originLng === undefined ||
        req.query.destLat === undefined ||
        req.query.destLng === undefined ||
        req.query.originLat.trim() === "" ||
        req.query.originLng.trim() === "" ||
        req.query.destLat.trim() === "" ||
        req.query.destLng.trim() === ""
      ) {
        return this.response({
          res,
          code: 204,
          message: "lat and lng need!",
        });
      }
      const originLat = req.query.originLat;
      const originLng = req.query.originLng;
      let origin = originLng + "," + originLat;
      const destLat = req.query.destLat;
      const destLng = req.query.destLng;
      let destination = destLng + "," + destLat;
      const url = `${process.env.ROUTE_URL}/route/v1/driving/${origin};${destination}?overview=full`;
      //  console.log("url", url);
      let distance = -1;
      let duration = -1;
      let geometry;
      const response = await axios.get(url);
      if (response.status === 200) {
        if (response.data.code.toString().toLowerCase() === "ok") {
          distance = response.data.routes[0].distance;
          duration = response.data.routes[0].duration;
          geometry = response.data.routes[0].geometry;
        }
      }

      return this.response({
        res,
        message: "ok",
        data: {
          distance,
          duration,
          geometry,
        },
      });
    } catch (error) {
      console.error("Error in getDistance:", error);
      return res.status(500).json({ error: "Internal Server Error." });
    }
  }

  async getTrip(req, res) {
    try {
      let { locations } = req.query;

      if (!locations) {
        return this.response({
          res,
          code: 204,
          message: "locations need!",
        });
      }

      locations = locations.replaceAll("|", "%7C");

      const url = `https://api.neshan.org/v3/trip?waypoints=${locations}&sourceIsAnyPoint=false`;
      const options = {
        headers: { "Api-Key": neshan },
        timeout: 9500,
      };

      const response = await axios.get(url, options);

      if (!response.data) {
        return this.response({
          res,
          code: 214,
          message: "Neshan not answer",
        });
      }

      const locs = response.data.points.map(
        (point) => `${point.location[0]},${point.location[1]}`
      );
      locs.push(locs[0]);

      let len = 0;
      const routes = [];

      for (let i = 0; i < locs.length - 1; i++) {
        const directionUrl = `https://api.neshan.org/v4/direction/no-traffic?origin=${
          locs[i]
        }&destination=${locs[i + 1]}`;

        const directionResponse = await axios.get(directionUrl, options);
        const distance =
          directionResponse.data.routes[0].legs[0].distance.value;
        routes.push(directionResponse.data.routes[0].overview_polyline.points);
        len += distance;
      }
      const data = {
        routes,
        points: response.data.points,
        distance: len,
        IsValid: true,
      };
      console.log("data", data);
      return this.response({
        res,
        message: "ok",
        data,
      });
    } catch (error) {
      console.error("Error in getTrip:", error);
      return this.response({
        res,
        code: 214,
        message: "Neshan not answer",
      });
    }
  }
  async getTripLocal(req, res) {
    try {
      let { locations } = req.query;

      if (!locations) {
        return this.response({
          res,
          code: 204,
          message: "locations need!",
        });
      }

      locations = locations.replaceAll("|", "%7C");

      const url = `${process.env.ROUTE_URL}/route/v1/driving/${locations}?overview=false`;
      const options = {
        timeout: 9500,
      };
      const response = await axios.get(url, options);

      if (!response.data) {
        return this.response({
          res,
          code: 214,
          message: "ip getTripLocal not answer",
        });
      }

      console.log("data", response);

      return this.response({
        res,
        message: "ok",
        // data: {
        //     routes,
        //     points: response.data.points,
        //     distance: len,
        //     IsValid: true,
        // },
      });
    } catch (error) {
      console.error("Error in getTripLocal:", error);
      return this.response({
        res,
        code: 214,
        message: "getTripLocal error",
      });
    }
  }
  async setCity(req, res) {
    try {
      const { code, province, name, active } = req.body;
      if (code != -1) {
        const city = await this.City.findOneAndUpdate(
          { code },
          {
            province,
            name,
            active,
          },
          { new: true }
        );
        return this.response({
          res,
          data: city,
        });
      }
      let city = new this.City({
        province,
        name,
        active,
      });
      await city.save();

      return this.response({
        res,
        data: city,
      });
    } catch (error) {
      console.error("Error in setCity:", error);
      return res.status(500).json({ error: error });
    }
  }
  async getCity(req, res) {
    try {
      const { province, code } = req.query;
      if (code != "-1") {
        const city = await this.City.findOne({ code: parseInt(code) });
        return this.response({
          res,
          data: [city],
        });
      }
      const city = await this.City.find({ province, delete: false });

      return this.response({
        res,
        data: city,
      });
    } catch (error) {
      console.error("Error in getCity:", error);
      return res.status(500).json({ error: error });
    }
  }
  async getAllCity(req, res) {
    try {
      const city = await this.City.find(
        { delete: false },
        "name code meter location.coordinates"
      );

      return this.response({
        res,
        data: city,
      });
    } catch (error) {
      console.error("Error in getAllCity:", error);
      return res.status(500).json({ error: error });
    }
  }
})();
